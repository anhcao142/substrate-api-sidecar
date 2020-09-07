import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';

import { TransactionMaterialService } from '../../services';
import AbstractController from '../AbstractController';

/**
 * GET all the network information needed to construct a transaction offline.
 *
 * Query
 * - (Optional) `noMeta`: If true, does not return metadata hex. This is useful when metadata is not
 * 		needed and response time is a concern. Defaults to false.
 * - (Optional) `at`: Block hash or number at which to query. If not provided, queries
 *   finalized head.
 *
 * Returns:
 * - `at`: Block number and hash at which the call was made.
 * - `genesisHash`: The hash of the chain's genesis block.
 * - `chainName`: The chain's name.
 * - `specName`: The chain's spec.
 * - `specVersion`: The spec version. Always increased in a runtime upgrade.
 * - `txversion`: The transaction version. Common `txVersion` numbers indicate that the
 *   transaction encoding format and method indices are the same. Needed for decoding in an
 *   offline environment. Adding new transactions does not change `txVersion`.
 * - `metadata`: The chain's metadata in hex format.
 *
 * Note: `chainName`, `specName`, and `specVersion` are used to define a type registry with a set
 * of signed extensions and types. For Polkadot and Kusama, `chainName` is not used in defining
 * this registry, but in other Substrate-based chains that re-launch their network without
 * changing the `specName`, the `chainName` would be needed to create the correct registry.
 *
 * Substrate Reference:
 * - `RuntimeVersion`: https://crates.parity.io/sp_version/struct.RuntimeVersion.html
 * - `SignedExtension`: https://crates.parity.io/sp_runtime/traits/trait.SignedExtension.html
 * -  FRAME Support: https://crates.parity.io/frame_support/metadata/index.html
 */
export default class TransactionMaterialController extends AbstractController<
	TransactionMaterialService
> {
	constructor(api: ApiPromise) {
		super(
			api,
			'/transaction/material',
			new TransactionMaterialService(api)
		);
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.safeMountAsyncGetHandlers([['', this.getTransactionMaterial]]);
	}

	/**
	 * GET all the network information needed to construct a transaction offline.
	 *
	 * @param _req Express Request
	 * @param res Express Response
	 */
	private getTransactionMaterial: RequestHandler = async (
		{ query: { noMeta, at } },
		res
	): Promise<void> => {
		const hash = await this.getHashFromAt(at);

		const noMetaArg = noMeta === 'true';

		TransactionMaterialController.sanitizedSend(
			res,
			await this.service.fetchTransactionMaterial(hash, noMetaArg)
		);
	};
}
